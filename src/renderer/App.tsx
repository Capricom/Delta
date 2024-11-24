import React, { FC, useState, useEffect } from 'react'
import Chat from './components/Chat'

export const App: FC = () => {

    return (
        <>
            <div className="h-full w-full bg-gray-900 flex flex-col items-center justify-center">
                <Chat />
            </div>

        </>
    )
}
