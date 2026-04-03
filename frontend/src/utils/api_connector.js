// ============================================================
// FILE: utils/api_connector.js
// PURPOSE: Central file that handles all communication
//          between React frontend and Django backend.
//          All API calls go through this file.
// ============================================================

import axios from 'axios';

// Django backend URL
const BACKEND_URL = 'http://127.0.0.1:8000/api';

// Create axios instance with default settings
const api = axios.create({
    baseURL: BACKEND_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default api;
