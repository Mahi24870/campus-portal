export const requireAuth = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    return res.status(401).json({ success: false, error: 'Unauthorized: Please log in' });
};

export const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.session || !req.session.user) {
            return res.status(401).json({ success: false, error: 'Unauthorized: Please log in' });
        }
        if (!roles.includes(req.session.user.role)) {
            return res.status(403).json({ success: false, error: 'Forbidden: Insufficient permissions' });
        }
        next();
    };
};

export const attachUser = (req, res, next) => {
    if (req.session && req.session.user) {
        req.user = req.session.user;
    }
    next();
};
