import {
    createContext,
    useContext,
    useEffect,
    useState
} from "react";

import api from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {

    const [user, setUser] = useState(null);

    const [loading, setLoading] = useState(true);


    // Check whether user is already authenticated
    useEffect(() => {

        const checkAuth = async () => {

            try {

                const response = await api.get("/auth/me");

                setUser(response.data.user);

            } catch (error) {

                setUser(null);

            } finally {

                setLoading(false);

            }

        };

        checkAuth();

    }, []);


    // Register user
    const register = async (name, email, password) => {

        const response = await api.post("/auth/register", {
            name,
            email,
            password,
        });

        return response.data;

    };


    // Login user
    const login = async (email, password) => {

        const response = await api.post("/auth/login", {
            email,
            password,
        });

        setUser(response.data.user);

        return response.data;

    };


    // Logout user
    const logout = async () => {

        try {

            await api.post("/auth/logout");

        } finally {

            setUser(null);

        }

    };


    const value = {
        user,
        loading,
        register,
        login,
        logout,
        isAuthenticated: !!user,
    };


    return (

        <AuthContext.Provider value={value}>

            {children}

        </AuthContext.Provider>

    );

};


// Custom authentication hook
export const useAuth = () => {

    return useContext(AuthContext);

};