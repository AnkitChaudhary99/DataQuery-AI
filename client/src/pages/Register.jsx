import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    Database,
    Mail,
    Lock,
    User,
    Eye,
    EyeOff,
    Sparkles
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import "./Auth.css";

function Register() {

    const { register } = useAuth();

    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [showPassword, setShowPassword] = useState(false);

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);


    const handleSubmit = async (e) => {

        e.preventDefault();

        setError("");

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (password.length < 8) {
            setError("Password must contain at least 8 characters.");
            return;
        }

        setLoading(true);

        try {

            await register(name, email, password);

            navigate("/login", {
                replace: true,
                state: {
                    message: "Account created successfully! Please sign in."
                }
            });

        } catch (err) {

            setError(
                err.response?.data?.message ||
                "Registration failed. Please try again."
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

                <h1>Create account</h1>

                <p className="auth-subtitle">
                    Start querying your database using natural language.
                </p>


                {error && (
                    <div className="auth-error">
                        {error}
                    </div>
                )}


                <form onSubmit={handleSubmit}>

                    <div className="auth-field">

                        <label>Full name</label>

                        <div className="auth-input-wrapper">

                            <User size={18} />

                            <input
                                type="text"
                                placeholder="Your name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />

                        </div>

                    </div>


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
                                placeholder="At least 8 characters"
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


                    <div className="auth-field">

                        <label>Confirm password</label>

                        <div className="auth-input-wrapper">

                            <Lock size={18} />

                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Confirm your password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />

                        </div>

                    </div>


                    <button
                        type="submit"
                        className="auth-submit"
                        disabled={loading}
                    >

                        {loading ? "Creating account..." : "Create account"}

                    </button>

                </form>


                <div className="auth-divider">
                    <span>OR</span>
                </div>


                <p className="auth-switch">

                    Already have an account?

                    <Link to="/login">
                        Sign in
                    </Link>

                </p>

            </div>


            <p className="auth-footer">
                DataQueryAI · AI-powered database intelligence
            </p>

        </div>

    );

}

export default Register;