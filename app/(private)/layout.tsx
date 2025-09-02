import React from 'react'
import { getUser } from '../actions/user'
import { redirect } from 'next/navigation'

const PrivateLayout = async ({ children }: { children: React.ReactNode }) => {
const user = await getUser()
if (!user) {
  redirect('/login')
}
                                                                                                                                                                                                                                                                                                                                                                                                                            
  return (
    <div>
      {children}
    </div>
  )
}

export default PrivateLayout