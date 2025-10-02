# mini-dropbox — developer quickstart

This repository contains two main components:

- `/` — React app (Create React App)
- `backend/` — Spring Boot application (Maven)

Use the quick instructions below to run each service locally.
## Frontend (React)

From the project root directory run:

```powershell
npm install         # install dependencies
npm start           # starts dev server at http://localhost:3000
```

To create a production build:

```powershell
npm run build       # outputs static files to frontend/build
```

## Backend (Spring Boot)

Prerequisites: Java 21+ and Maven installed

From the project root directory run:

```powershell
cd backend
mvn spring-boot:run

The backend will start on http://localhost:8080 by default. Adjust `application.properties` or environment variables as needed.