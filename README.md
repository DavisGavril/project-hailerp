# EduPulse ERP

## Run the backend

From this folder, start the server with:

```bash
python server.py
```

The app will be available at:

- http://localhost:8000/
- http://localhost:8000/index.html

## Notes

- Authentication and user registration now use MongoDB.
- By default the backend connects to a local MongoDB instance at `mongodb://127.0.0.1:27017`.
- To use MongoDB Atlas, set the `MONGO_URI` environment variable to your Atlas connection string.
- Optionally set `MONGO_DB_NAME` to choose a different database name (default: `edupulse`).
- Default demo accounts are seeded automatically on first run.
