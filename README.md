# WebGIS Application

A web-based geographic information system (GIS) application that enables visualization, spatial querying, and filtering of geospatial data. This application utilizes React and Maplibre for the frontend map visualization, and a PostgreSQL/PostGIS database for backend geospatial data storage and retrieval.

## Features

- Visualize health facilities and other uploaded locations on an interactive map.
- Filter facilities by type, radius, and user-defined location.
- Upload CSV data to add new facility markers on the map.
- User location detection for displaying nearby facilities.
- Dynamic radius input that adjusts the map view and shows facilities within the specified distance.

## Preferred Viewport
This application is designed for optimal viewing and interaction on devices with larger screens:

- Desktop computers
- Laptops
- Tablets (landscape orientation)

While the app may be accessible on smaller devices, the complex map interactions and data visualizations are best experienced on screens with a width of at least 768px. The layout and functionality are optimized for these larger viewports to ensure the best user experience when working with geospatial data and map interfaces.

## Prerequisites

Ensure you have the following installed on your machine:

- [Node.js](https://nodejs.org/) (v14 or later)
- [PostgreSQL](https://www.postgresql.org/) (v12 or later) with the PostGIS extension

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/nestah/webGIS.git
cd webGIS
```

### 2. Install Dependencies

#### Frontend

Navigate to the frontend folder and install dependencies:

```bash
cd frontend
npm install
```

#### Backend
Navigate to the backend folder and install dependencies:

```bash
cd ../backend
npm install
```

### 3. Configure Environment Variables

Create a `.env`(you can delete existing but ensure to include all connection variables used in server file) file in the backend directory and set up the following environment variables:

```plaintext
DB_USER=your_postgres_username
DB_HOST=localhost
DB_NAME=test (or you can set your own database and change the name in the .env file in the backend folder)
DB_PASSWORD=your_postgres_password
DB_PORT=5432
PORT=5000
```

Replace `your_postgres_username` and `your_postgres_password` with your PostgreSQL credentials.

### 4. Initialize the Database

Open PostgreSQL and run the following commands to create the database and enable the PostGIS extension:

```sql
CREATE DATABASE test;
\c test;
CREATE EXTENSION postgis;
```

### 5. Start the Application

#### Backend Server

Navigate to the backend folder and start the server:

```bash
cd backend
npm start
```

The server should now be running on `http://localhost:5000`.
test the api endpoints:
http://localhost:5000/api/facilities
http://localhost:5000/api/facility-types
IMPORTANT!: Make sure to use the health_facilities dump table in the database you create for this to work. Simply import the table in your database of choice

#### Frontend Application

In a separate terminal, navigate to the project folder and start the React app:

```bash
cd frontend
npm start
```

The application should open in your default browser at `http://localhost:4000`.

## Usage

- Use the sidebar on small screens or the navbar on larger screens to navigate.
- Upload CSV files containing facility information to visualize them on the map.
- Filter facilities by selecting a type or setting a search radius.
- set a custom radius filter by right-clicking on the map for large viewport devices or long-press for mobile       devices for context-menu to pop up.