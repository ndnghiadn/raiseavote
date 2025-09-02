'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { setTokenCookies } from '@/actions/user';
import { IUserInfo } from '@/models/User';

interface PrivateLayoutProviderProps {
    userInfo: IUserInfo;
    children: React.ReactNode;
}

const UserInfoContext = createContext<IUserInfo | null>(null);

export const useUserInfo = () => {
    const context = useContext(UserInfoContext);
    if (!context) {
        throw new Error('useUserInfo must be used within PrivateLayoutProvider');
    }
    return context;
};

export default function PrivateLayoutProvider({ userInfo, children }: PrivateLayoutProviderProps) {
    useEffect(() => {
         // Refresh token once immediately on mount (client-side)
         (async () => {
            try {
                await setTokenCookies({ id: userInfo.id });
                console.log('Token refreshed successfully');
            } catch (error) {
                console.error('Token refresh failed:', error);
            }
        })()
    }, [])

    return (
        <UserInfoContext.Provider value={userInfo}>
            {children}
        </UserInfoContext.Provider>
    );
}