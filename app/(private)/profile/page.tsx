import { getUser } from '@/app/actions/user';
import React from 'react'
import ClientProfilePage from './ClientProfilePage';

const ProfilePage = async () => {
  const user = await getUser();
  
  return (
    <ClientProfilePage user={user!} />
  )
}

export default ProfilePage