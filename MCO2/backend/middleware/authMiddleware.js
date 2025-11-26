const authMiddleware = (req, res, next) => {
    // 1. Check for the custom header sent by our axios.js interceptor
    const customerIdHeader = req.headers['x-customer-id'];

    // 2. If the header exists, attach it to the request object
    if (customerIdHeader) {
        req.user = {
            id: parseInt(customerIdHeader, 10) // Convert string "3" to number 3
        };
        console.log(`Middleware: Authenticated as User ID ${req.user.id}`);
    } else {
        // 3. Fallback for testing or if header is missing
        req.user = { id: 1 }; 
        console.log('Middleware: No header found, defaulting to User ID 1');
    }

    // 4. Move to the next step (the actual API route)
    next(); 
};

module.exports = authMiddleware;