/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                gray: {
                    50: '#fafafa',
                    100: '#f5f5f5',
                    200: '#e5e5e5',
                    300: '#d4d4d4',
                    400: '#a3a3a3',
                    500: '#737373',
                    600: '#525252',
                    700: '#404040',
                    800: '#262626',
                    900: '#171717',
                    950: '#0a0a0a',
                },
                pepite: {
                    cream: '#F2E5BD',
                    gold: '#F2B441',
                    bronze: '#D98D30',
                    gray: '#404040',
                    dark: '#1A1A1A', // Softened dark gray for elegance
                    yellow: '#F2B441', // Aliasing yellow to gold from palette
                    white: '#FFFFFF',
                }
            },
            fontFamily: {
                sans: ['Poppins', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
