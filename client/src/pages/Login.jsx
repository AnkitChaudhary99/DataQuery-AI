import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Database, Mail, Lock, Eye, EyeOff, Sparkles } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import "./Auth.css";

function Login() {

    const { login } = useAuth();

    const navigate = useNavigate();
    const location = useLocation();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const successMessage = location.state?.message;

    const handleSubmit = async (e) => {

        e.preventDefault();

        setError("");
        setLoading(true);

        try {

            await login(email, password);

            navigate("/", { replace: true });

        } catch (err) {

            setError(
                err.response?.data?.message ||
                "Login failed. Please check your credentials."
            );

        } finally {

            setLoading(false);

        }

    };

    return (

        <div className="auth-page">

            <div className="auth-brand">

                <div className="auth-logo">
                    <Database size={25} />
                </div>

                <span>DataQueryAI</span>

            </div>


            <div className="auth-card">

                <div className="auth-icon">
                    <Sparkles size={25} />
                </div>

                <h1>Welcome back</h1>

                <p className="auth-subtitle">
                    Sign in to continue exploring your database with AI.
                </p>


                {successMessage && (
                    <div className="auth-success">
                        {successMessage}
                    </div>
                )}


                {error && (
                    <div className="auth-error">
                        {error}
                    </div>
                )}


                <form onSubmit={handleSubmit}>

                    <div className="auth-field">

                        <label>Email address</label>

                        <div className="auth-input-wrapper">

                            <Mail size={18} />

                            <input
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />

                        </div>

                    </div>


                    <div className="auth-field">

                        <label>Password</label>

                        <div className="auth-input-wrapper">

                            <Lock size={18} />

                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />

                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? (
                                    <EyeOff size={18} />
                                ) : (
                                    <Eye size={18} />
                                )}
                            </button>

                        </div>

                    </div>


                    <button
                        type="submit"
                        className="auth-submit"
                        disabled={loading}
                    >

                        {loading ? "Signing in..." : "Sign in"}

                    </button>

                </form>


                <div className="auth-divider">
                    <span>OR</span>
                </div>


                <p className="auth-switch">

                    Don't have an account?

                    <Link to="/register">
                        Create account
                    </Link>

                </p>

            </div>


            <p className="auth-footer">
                DataQueryAI · AI-powered database intelligence
            </p>

        </div>

    );

}

export default Login;