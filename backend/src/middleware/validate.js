const { validationResult } = require('express-validator');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMsgs = errors.array().map(err => `${err.path}: ${err.msg}`).join(', ');
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      message: errorMsgs,
      errors: errors.array()
    });
  }
  next();
}

module.exports = validate;
