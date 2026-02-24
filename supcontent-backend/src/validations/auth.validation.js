const Joi = require('joi');

const registerSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Invalid email format.',
        'any.required': 'Email is required.',
    }),
    username: Joi.string().min(3).max(50).required().messages({
        'string.min': 'Username must be at least 3 characters.',
        'string.max': 'Username must be at most 50 characters.',
        'any.required': 'Username is required.',
    }),
    password: Joi.string()
        .min(8)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .required()
        .messages({
            'string.min': 'Password must be at least 8 characters.',
            'string.pattern.base': 'Password must contain uppercase, lowercase, and a number.',
            'any.required': 'Password is required.',
        }),
});

const loginSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Invalid email format.',
        'any.required': 'Email is required.',
    }),
    password: Joi.string().required().messages({
        'any.required': 'Password is required.',
    }),
});

module.exports = { registerSchema, loginSchema };
