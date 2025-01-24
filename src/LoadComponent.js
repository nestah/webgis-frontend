import React, { useEffect } from 'react';
import { useLoading } from './LoadingContext';
import './LoadComponent.css';

const LoadComponent = () => {
  const { isLoading } = useLoading();

  useEffect(() => {
    document.body.style.overflow = isLoading ? 'hidden' : 'visible';
    return () => {
      document.body.style.overflow = 'visible';
    };
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div className="load-overlay">
      <div className="spinner"></div>
      <p>Almost there...</p>
    </div>
  );
};

export default LoadComponent;