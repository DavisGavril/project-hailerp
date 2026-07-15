import hashlib
import json
import mimetypes
import os
import urllib.parse
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

try:
    from pymongo import MongoClient
    from pymongo.errors import DuplicateKeyError
except ImportError:
    MongoClient = None
    DuplicateKeyError = Exception

ROOT = Path(__file__).resolve().parent
MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "edupulse")

client = None

def get_db():
    global client
    if MongoClient is None:
        raise RuntimeError("pymongo is not installed")
    if client is None:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    return client[MONGO_DB_NAME]


def init_db():
    db = get_db()
    db.users.create_index("email", unique=True)
    db.users.create_index("reg_id", unique=True)
    db.login_logs.create_index("logged_at")
    # Migration: Set status="approved" for existing users
    db.users.update_many({"status": {"$exists": False}}, {"$set": {"status": "approved"}})
    seed_default_users()


def seed_default_users():
    default_users = [
        {
            "email": "davis.gavril@institution.edu",
            "password": "password123",
            "role": "student",
            "name": "Davis Gavril",
            "dept": "IT",
            "reg_id": "731122205012",
            "status": "approved",
            "cgpa": "8.74",
            "fees_due": 12500,
            "fees_status": "Pending",
            "attendance": {
                "Cloud Computing": {"attended": 38, "held": 40},
                "Machine Learning": {"attended": 34, "held": 38},
                "Prompt Engineering": {"attended": 33, "held": 36},
                "Software Architecture": {"attended": 33, "held": 40},
                "Computer Networks": {"attended": 29, "held": 39},
                "Professional Ethics": {"attended": 36, "held": 39}
            }
        },
        {
            "email": "karthik.s@institution.edu",
            "password": "password123",
            "role": "student",
            "name": "Karthik S",
            "dept": "IT",
            "reg_id": "731122205019",
            "status": "approved",
            "cgpa": "6.85",
            "fees_due": 0,
            "fees_status": "Paid",
            "attendance": {
                "Cloud Computing": {"attended": 35, "held": 40},
                "Machine Learning": {"attended": 30, "held": 38},
                "Prompt Engineering": {"attended": 32, "held": 36},
                "Software Architecture": {"attended": 31, "held": 40},
                "Computer Networks": {"attended": 26, "held": 39},
                "Professional Ethics": {"attended": 34, "held": 39}
            }
        },
        {
            "email": "prof.iyer@institution.edu",
            "password": "password123",
            "role": "faculty",
            "name": "Prof. S. Iyer",
            "dept": "CSE",
            "reg_id": "EMP-2024-802",
            "status": "approved"
        },
        {
            "email": "prof.menon@institution.edu",
            "password": "password123",
            "role": "faculty",
            "name": "Dr. R. Menon",
            "dept": "IT",
            "reg_id": "EMP-2024-704",
            "status": "approved"
        },
        {
            "email": "admin@institution.edu",
            "password": "password123",
            "role": "admin",
            "name": "System Admin",
            "dept": "Admin Office",
            "reg_id": "EMP-2022-001",
            "status": "approved"
        },
    ]

    db = get_db()
    for user in default_users:
        update_doc = {
            "email": user["email"].lower(),
            "password_hash": hash_password(user["password"]),
            "role": user["role"],
            "name": user["name"],
            "dept": user["dept"],
            "reg_id": user["reg_id"],
            "status": user["status"],
        }
        if user["role"] == "student":
            update_doc.update({
                "cgpa": user["cgpa"],
                "fees_due": user["fees_due"],
                "fees_status": user["fees_status"],
                "attendance": user["attendance"]
            })
        db.users.update_one(
            {"email": user["email"].lower()},
            {"$setOnInsert": update_doc},
            upsert=True,
        )


def hash_password(password):
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def fetch_user(email):
    db = get_db()
    user = db.users.find_one({"email": email.lower()}, {"_id": 0})
    if not user:
        return None
    return {
        "email": user["email"],
        "role": user["role"],
        "name": user["name"],
        "dept": user["dept"],
        "reg_id": user["reg_id"],
        "status": user.get("status", "pending"),
        "phone": user.get("phone", ""),
        "address": user.get("address", "")
    }


def verify_credentials(email, password, role):
    db = get_db()
    user = db.users.find_one({"email": email.lower()}, {"_id": 0})
    if not user:
        return None
    stored_hash = user.get("password_hash")
    if stored_hash != hash_password(password):
        return None
    if user.get("role", "").lower() != role.lower():
        return None
    return user


def record_login(user):
    db = get_db()
    db.login_logs.insert_one(
        {
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "reg_id": user["reg_id"],
            "logged_at": datetime.now(timezone.utc).isoformat(),
        }
    )



class EduPulseHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path
        if path == "/api/health":
            try:
                db = get_db()
                db.command("ping")
                self._send_json({"status": "ok", "database": MONGO_DB_NAME, "mongo": MONGO_URI})
            except Exception as exc:
                self._send_json({"status": "error", "message": str(exc)}, status=500)
            return
        if path == "/api/users":
            db = get_db()
            rows = list(db.users.find({}, {"_id": 0, "password_hash": 0}).sort("email", 1))
            self._send_json(rows)
            return
        if path == "/api/profile":
            query = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            email = (query.get("email", [""])[0] or "").strip().lower()
            role = (query.get("role", [""])[0] or "").strip().lower()
            user = fetch_user(email)
            if not user:
                self._send_json({"error": "No profile found"}, status=404)
                return
            if role and user["role"].lower() != role:
                self._send_json({"error": "Role mismatch"}, status=404)
                return
            self._send_json(user)
            return
        if path == "/api/student/academics":
            query = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            email = (query.get("email", [""])[0] or "").strip().lower()
            db = get_db()
            user = db.users.find_one({"email": email})
            if not user:
                self._send_json({"error": "User not found"}, status=404)
                return
            self._send_json({
                "cgpa": user.get("cgpa", ""),
                "fees_due": user.get("fees_due", 0),
                "fees_status": user.get("fees_status", "Pending Update"),
                "attendance": user.get("attendance", {})
            })
            return
        if path == "/api/faculty/students":
            query = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            email = (query.get("email", [""])[0] or "").strip().lower()
            db = get_db()
            faculty = db.users.find_one({"email": email})
            if not faculty:
                self._send_json({"error": "Faculty not found"}, status=404)
                return
            fac_depts = [d.strip().lower() for d in faculty.get("dept", "").split(",") if d.strip()]
            students = []
            all_users = list(db.users.find({"role": "student"}, {"_id": 0, "password_hash": 0}))
            for u in all_users:
                u_depts = [d.strip().lower() for d in u.get("dept", "").split(",") if d.strip()]
                if any(d in fac_depts for d in u_depts) or len(fac_depts) == 0:
                    students.append(u)
            self._send_json(students)
            return

        if path in ["/", ""]:
            path = "/index.html"

        if path in ["/dashboard", "/student-dashboard", "/faculty-dashboard", "/admin-dashboard"]:
            path = path + ".html"

        file_path = (ROOT / path.lstrip("/")).resolve()
        try:
            if file_path.exists() and file_path.is_file() and str(file_path).startswith(str(ROOT)):
                self._serve_file(file_path)
                return
        except OSError:
            pass

        self._send_json({"error": "Not found"}, status=404)


    def do_POST(self):
        path = urllib.parse.urlparse(self.path).path
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode("utf-8")

        try:
            payload = json.loads(body) if body else {}
        except json.JSONDecodeError:
            self._send_json({"error": "Invalid JSON"}, status=400)
            return

        if path == "/api/signup":
            self._handle_signup(payload)
        elif path == "/api/login":
            self._handle_login(payload)
        elif path == "/api/users/action":
            email = payload.get("email", "").strip().lower()
            action = payload.get("action", "").strip().lower()
            if not email or action not in {"approve", "reject"}:
                self._send_json({"error": "Invalid parameters"}, status=400)
                return
            db = get_db()
            status_val = "approved" if action == "approve" else "rejected"
            res = db.users.update_one({"email": email}, {"$set": {"status": status_val}})
            if res.matched_count == 0:
                self._send_json({"error": "User not found"}, status=404)
                return
            self._send_json({"message": f"User status updated to {status_val} successfully."})
        elif path == "/api/profile/update":
            email = payload.get("email", "").strip().lower()
            phone = payload.get("phone", "").strip()
            address = payload.get("address", "").strip()
            role = payload.get("role", "").strip()
            if not email:
                self._send_json({"error": "Email is required"}, status=400)
                return
            db = get_db()
            update_fields = {}
            if phone: update_fields["phone"] = phone
            if address: update_fields["address"] = address
            if role: update_fields["role"] = role.lower()
            res = db.users.update_one({"email": email}, {"$set": update_fields})
            if res.matched_count == 0:
                self._send_json({"error": "User not found"}, status=404)
                return
            self._send_json({"message": "Profile updated successfully."})
        elif path == "/api/student/academics/update":
            email = payload.get("email", "").strip().lower()
            cgpa = payload.get("cgpa", "").strip()
            fees_due = payload.get("fees_due")
            fees_status = payload.get("fees_status", "").strip()
            attendance = payload.get("attendance", {})
            if not email:
                self._send_json({"error": "Email is required"}, status=400)
                return
            db = get_db()
            update_fields = {}
            if cgpa is not None: update_fields["cgpa"] = cgpa
            if fees_due is not None:
                try:
                    update_fields["fees_due"] = int(fees_due)
                except (ValueError, TypeError):
                    update_fields["fees_due"] = fees_due
            if fees_status: update_fields["fees_status"] = fees_status
            if attendance: update_fields["attendance"] = attendance
            res = db.users.update_one({"email": email}, {"$set": update_fields})
            if res.matched_count == 0:
                self._send_json({"error": "User not found"}, status=404)
                return
            self._send_json({"message": "Academics updated successfully."})
        else:
            self._send_json({"error": "Not found"}, status=404)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def _handle_signup(self, payload):
        email = (payload.get("email") or "").strip().lower()
        password = (payload.get("password") or "").strip()
        role = (payload.get("role") or "student").strip().lower()
        name = (payload.get("name") or "").strip()
        dept = (payload.get("dept") or "").strip()
        reg_id = (payload.get("regId") or "").strip()

        if not email or "@" not in email:
            self._send_json({"error": "Enter a valid institutional email"}, status=400)
            return
        if len(password) < 6:
            self._send_json({"error": "Password must be at least 6 characters"}, status=400)
            return
        if not role or role not in {"student", "faculty", "admin"}:
            self._send_json({"error": "Select a valid role"}, status=400)
            return
        if not name or not dept or not reg_id:
            self._send_json({"error": "Complete all profile fields"}, status=400)
            return

        db = get_db()
        try:
            user_doc = {
                "email": email,
                "password_hash": hash_password(password),
                "role": role,
                "name": name,
                "dept": dept,
                "reg_id": reg_id,
                "status": "pending"
            }
            if role == "student":
                user_doc.update({
                    "cgpa": "",
                    "fees_due": 0,
                    "fees_status": "Pending Update",
                    "attendance": {
                        "Cloud Computing": {"attended": 0, "held": 0},
                        "Machine Learning": {"attended": 0, "held": 0},
                        "Prompt Engineering": {"attended": 0, "held": 0},
                        "Software Architecture": {"attended": 0, "held": 0},
                        "Computer Networks": {"attended": 0, "held": 0},
                        "Professional Ethics": {"attended": 0, "held": 0}
                    }
                })
            db.users.insert_one(user_doc)
        except DuplicateKeyError:
            self._send_json({"error": "An account with this email already exists"}, status=409)
            return

        user = {"email": email, "role": role, "name": name, "dept": dept, "reg_id": reg_id}
        self._send_json({"message": "Account created successfully. Pending administrator approval.", "user": user})

    def _handle_login(self, payload):
        email = (payload.get("email") or "").strip().lower()
        password = (payload.get("password") or "").strip()
        role = (payload.get("role") or "student").strip().lower()

        if not email or "@" not in email:
            self._send_json({"error": "Enter a valid institutional email"}, status=400)
            return
        if not password:
            self._send_json({"error": "Password is required"}, status=400)
            return

        user = verify_credentials(email, password, role)
        if not user:
            if fetch_user(email):
                self._send_json({"error": "Invalid password"}, status=401)
            else:
                self._send_json({"error": "No account found"}, status=404)
            return

        status = user.get("status", "pending")
        if status == "pending":
            self._send_json({"error": "Your account is pending administrator approval."}, status=403)
            return
        elif status == "rejected":
            self._send_json({"error": "Your registration request was rejected by the administrator."}, status=403)
            return

        record_login(user)
        self._send_json({"message": "Login successful", "user": {
            "email": user["email"],
            "role": user["role"],
            "name": user["name"],
            "dept": user["dept"],
            "reg_id": user["reg_id"]
        }})


    def _serve_file(self, file_path):
        if file_path.suffix.lower() in {".html", ".css", ".js", ".json", ".txt", ".svg", ".png", ".jpg", ".jpeg", ".gif", ".ico", ".webp"}:
            mime_type, _ = mimetypes.guess_type(str(file_path))
            if not mime_type:
                mime_type = "application/octet-stream"
            self.send_response(200)
            self.send_header("Content-Type", mime_type)
            self.end_headers()
            with file_path.open("rb") as stream:
                self.wfile.write(stream.read())
            return

        self._send_json({"error": "Not found"}, status=404)

    def _send_json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)


def main():
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    print(f"EduPulse backend starting...")
    print(f"MongoDB endpoint: {MONGO_URI}")
    print(f"MongoDB database: {MONGO_DB_NAME}")
    
    try:
        init_db()
        print("Database initialized successfully.")
    except Exception as exc:
        print(f"DATABASE INIT ERROR: {exc}")
        print("Make sure you have added the MONGO_URI environment variable in Render, and configured MongoDB Atlas Network Access (IP Whitelist) to allow access from anywhere (0.0.0.0/0).")
        import sys
        sys.exit(1)

    print(f"EduPulse backend running on http://{host}:{port}")
    server = ThreadingHTTPServer((host, port), EduPulseHandler)
    server.serve_forever()


if __name__ == "__main__":
    main()

