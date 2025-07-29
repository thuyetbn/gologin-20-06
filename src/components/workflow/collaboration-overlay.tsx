import React from 'react';
import { CollaborationUser } from '../../services/collaboration-service';

interface CollaborationOverlayProps {
  users: CollaborationUser[];
  currentUserId: string;
}

const CollaborationOverlay: React.FC<CollaborationOverlayProps> = ({
  users,
  currentUserId,
}) => {
  // Filter out current user
  const otherUsers = users.filter(user => user.id !== currentUserId);

  return (
    <>
      {/* User Avatars in Top Right */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        {otherUsers.slice(0, 5).map(user => (
          <div
            key={user.id}
            className="relative group"
          >
            <div
              className="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-semibold"
              style={{ backgroundColor: user.color }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap">
              {user.name}
              {user.selectedNodeId && (
                <div className="text-xs opacity-75">
                  Editing node
                </div>
              )}
            </div>
          </div>
        ))}
        
        {otherUsers.length > 5 && (
          <div className="w-8 h-8 rounded-full bg-gray-500 border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-semibold">
            +{otherUsers.length - 5}
          </div>
        )}
      </div>

      {/* Collaborative Cursors */}
      {otherUsers
        .filter(user => user.cursor)
        .map(user => (
          <div
            key={`cursor-${user.id}`}
            className="absolute z-40 pointer-events-none transition-all duration-100 ease-out"
            style={{
              left: user.cursor!.x,
              top: user.cursor!.y,
              transform: 'translate(-2px, -2px)',
            }}
          >
            {/* Cursor Icon */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              className="drop-shadow-lg"
            >
              <path
                d="M5.5 3L19 12L12 13.5L8.5 20L5.5 3Z"
                fill={user.color}
                stroke="white"
                strokeWidth="1"
              />
            </svg>
            
            {/* User Name Badge */}
            <div 
              className="ml-6 -mt-2 px-2 py-1 text-xs text-white rounded shadow-lg whitespace-nowrap"
              style={{ backgroundColor: user.color }}
            >
              {user.name}
            </div>
          </div>
        ))}

      {/* Node Selection Indicators */}
      {otherUsers
        .filter(user => user.selectedNodeId)
        .map(user => (
          <div
            key={`selection-${user.id}`}
            className="absolute z-30 pointer-events-none"
            style={{
              // Position would be calculated based on node position
              // This is a simplified version
            }}
          >
            <div
              className="absolute -inset-2 rounded-lg border-2 border-dashed animate-pulse"
              style={{ borderColor: user.color }}
            />
            <div
              className="absolute -top-6 left-0 text-xs text-white px-2 py-1 rounded"
              style={{ backgroundColor: user.color }}
            >
              {user.name} is editing
            </div>
          </div>
        ))}
    </>
  );
};

export default CollaborationOverlay; 