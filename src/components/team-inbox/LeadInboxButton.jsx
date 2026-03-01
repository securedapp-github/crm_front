import React from 'react';
import { useNavigate } from 'react-router-dom';

const LeadInboxButton = ({ leadId, email }) => {
    const navigate = useNavigate();

    const handleOpenInbox = async () => {
        try {
            // Option 1: Just navigate to inbox. 
            // Better UX: Navigate to inbox and auto-select the thread.
            // You can pass the leadId in state to the layout component so it auto-selects.
            navigate('/dashboard/team-inbox', { state: { leadId } });
        } catch (error) {
            console.error('Error navigating to inbox', error);
        }
    };

    return (
        <button
            className="btn btn-primary"
            onClick={handleOpenInbox}
            title="View emails for this lead"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
            <i className="fas fa-envelope"></i> Team Inbox
        </button>
    );
};

export default LeadInboxButton;
