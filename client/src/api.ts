/** Typed axios wrapper attaches the short-lived credential and keeps API calls out of views. */
import axios from 'axios';
export const api=axios.create({baseURL:import.meta.env.VITE_API_URL||'http://localhost:4000/api/v1'});
api.interceptors.request.use(c=>{const t=localStorage.getItem('dayflow_access');if(t)c.headers.Authorization=`Bearer ${t}`;return c;});
