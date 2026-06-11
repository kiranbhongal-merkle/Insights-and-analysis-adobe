import React from 'react';
import ReactDOM from 'react-dom/client';
import { initBigQueryOnlyMode } from './utils/loadLiveData';
import App from './App';

initBigQueryOnlyMode();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);
