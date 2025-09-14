export const dynamic = "force-dynamic";

import React from 'react'
import { getUserInfo } from '../../actions/user'
import PrivateLayoutProvider from './provider'

const PrivateLayout = async ({ children }: { children: React.ReactNode }) => {
  const userInfo = await getUserInfo()
                                                                                                                                                                                                                                                                                                                                                                                                                            
  return (
    <PrivateLayoutProvider userInfo={userInfo}>
       {children}
    </PrivateLayoutProvider>
  )
}

export default PrivateLayout