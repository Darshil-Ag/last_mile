import React from 'react';

export default function Spinner({ size = 'sm', text }) {
  return (
    <div className="spinner-center">
      <div className={`spinner ${size === 'lg' ? 'spinner-lg' : ''}`} />
      {text && <span>{text}</span>}
    </div>
  );
}
