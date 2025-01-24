import React, { useState } from 'react';
import './upload.css';
import axios from 'axios';

const UploadPopup = ({ onClose, onUploadSuccess }) => {
    const [file, setFile] = useState(null);
    const [uploadStatus, setUploadStatus] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [errors, setErrors] = useState([]);

    const handleFileChange = (event) => {
        setFile(event.target.files[0]);
        setUploadStatus(''); // Reset status message
        setErrors([]); // Reset errors
    };

    const handleUpload = async () => {
        if (!file) {
            setUploadStatus('Please select a file first.');
            return;
        }

        setIsUploading(true);
        setErrors([]);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post('https://364e-102-215-77-202.ngrok-free.app/api/upload-csv', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadStatus(`Uploading: ${percentCompleted}%`);
                }
            });
            
            // Handle successful response
            if (response.data.message) {
                setUploadStatus(`Success: ${response.data.message} (${response.data.rowsProcessed} rows processed)`);
                setFile(null);
                
                if (onUploadSuccess) {
                    onUploadSuccess();
                }
                
                // Delay popup close to show success message
                setTimeout(() => {
                    onClose();
                }, 2000);
            }

        } catch (error) {
            console.error("Upload error:", error);
            
            // Handle different types of errors
            if (error.response) {
                const responseData = error.response.data;
                
                if (responseData.details && Array.isArray(responseData.details)) {
                    // Handle validation errors
                    setErrors(responseData.details);
                    setUploadStatus('Upload failed: Please check the errors below');
                } else if (responseData.error) {
                    // Handle general error message
                    setUploadStatus(`Error: ${responseData.error}`);
                    setErrors(Array.isArray(responseData.details) ? responseData.details : [responseData.details]);
                }
            } else if (error.request) {
                // Handle network errors
                setUploadStatus('Network error: Could not reach the server');
            } else {
                // Handle unexpected errors
                setUploadStatus('An unexpected error occurred');
            }
        } finally {
            setIsUploading(false);
        }
    };

    const handleDragOver = (event) => {
        event.preventDefault();
        event.currentTarget.classList.add('drag-over');
    };

    const handleDragLeave = (event) => {
        event.preventDefault();
        event.currentTarget.classList.remove('drag-over');
    };

    const handleDrop = (event) => {
        event.preventDefault();
        event.currentTarget.classList.remove('drag-over');
        
        const droppedFile = event.dataTransfer.files[0];
        if (droppedFile && droppedFile.type === 'text/csv') {
            setFile(droppedFile);
            setUploadStatus('');
            setErrors([]);
        } else {
            setUploadStatus('Please upload a CSV file.');
        }
    };

    return (
        <div className="popup-overlay">
            <div 
                className="popup-card" 
                onDrop={handleDrop} 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
            >
                <button 
                    className="close-button" 
                    onClick={() => { 
                        onClose(); 
                        setUploadStatus(''); 
                        setErrors([]); 
                    }}
                    disabled={isUploading}
                >
                    X
                </button>
                <h2>Upload CSV File</h2>
                <div className="upload-area">
                    <input 
                        type="file" 
                        accept=".csv" 
                        onChange={handleFileChange}
                        disabled={isUploading}
                    />
                    <p>Drag and drop your CSV file here or click to browse</p>
                    {file && <p className="selected-file">Selected: {file.name}</p>}
                </div>
                <button 
                    className={`upload-button ${isUploading ? 'uploading' : ''}`} 
                    onClick={handleUpload}
                    disabled={!file || isUploading}
                >
                    {isUploading ? 'Uploading...' : 'Upload'}
                </button>
                {uploadStatus && (
                    <p className={`status-message ${
                        uploadStatus.includes('Error') || uploadStatus.includes('failed') 
                            ? 'error' 
                            : uploadStatus.includes('Success') 
                                ? 'success' 
                                : ''
                    }`}>
                        {uploadStatus}
                    </p>
                )}
                {errors.length > 0 && (
                    <div className="error-list">
                        <h3>Upload Issues:</h3>
                        <ul>
                            {errors.map((error, index) => (
                                <li key={index} className="error-item">
                                    {typeof error === 'string' ? error : JSON.stringify(error)}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UploadPopup;
