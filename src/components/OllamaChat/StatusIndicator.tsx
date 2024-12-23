import React from 'react';

interface StatusIndicatorProps {
    status: 'success' | 'error' | 'loading' | 'unchecked';
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
    const getStatusColor = () => {
        switch (status) {
            case 'success':
                return 'bg-green-500'; // Green for success
            case 'error':
                return 'bg-red-500';   // Red for error
            case 'loading':
                return 'bg-yellow-500'; // Yellow for loading
            default:
                return 'bg-gray-500';   // Default color
        }
    };

    return (
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
    );
};

export default StatusIndicator; 
