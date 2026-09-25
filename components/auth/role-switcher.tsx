"use client";

import { useState } from 'react';
import { RoleBadge } from '../ui/badge';
import { Button } from '../ui/button';

interface RoleSwitcherProps {
  currentRole: string;
  onRoleSwitch: (role: string) => void;
}

export function RoleSwitcher({ currentRole, onRoleSwitch }: RoleSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);

  const roles = [
    {
      id: 'ADMIN',
      name: 'Admin',
      description: 'Full workspace control',
      icon: '🔒'
    },
    {
      id: 'ANALYST',
      name: 'Analyst',
      description: 'Feedback & analysis',
      icon: '📊'
    },
    {
      id: 'VIEWER',
      name: 'Viewer',
      description: 'Read-only access',
      icon: '👁️'
    }
  ];

  const currentRoleData = roles.find(r => r.id === currentRole) || roles[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2 rounded-lg bg-white border border-gray-200 hover:border-gray-300 transition-all"
      >
        <span className="text-sm text-gray-600">Current role:</span>
        <RoleBadge role={currentRole} />
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-20 animate-fade-in">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Switch Role</h3>
              <p className="text-sm text-gray-500 mt-1">
                Select a role to switch your workspace access
              </p>
            </div>

            <div className="p-2">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => {
                    setIsOpen(false);
                    onRoleSwitch(role.id);
                  }}
                  className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{role.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{role.name}</span>
                        {role.id === currentRole && (
                          <span className="text-xs text-green-600 font-medium">Current</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{role.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="p-3 bg-gray-50 rounded-b-xl border-t border-gray-100">
              <p className="text-xs text-gray-500 text-center">
                🔒 Secure: Role switching requires re-authentication
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}