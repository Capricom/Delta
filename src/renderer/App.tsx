import React, { FC, useState, useEffect } from 'react'

export const App: FC = () => {
    const [count, setCount] = useState(0)

    useEffect(() => {
        document.title = `Count: ${count}`
    }, [count])

    return (
        <div className="h-full w-full bg-gray-900 flex flex-col items-center justify-center gap-4">
            <h1 className="text-4xl font-bold text-gray-100">Hello from React!</h1>
            <button
                onClick={() => setCount(count + 1)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
                Count: {count}
            </button>
        </div>
    )
}
