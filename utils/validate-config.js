const yup = require('yup')

const validateConfig = config => {
  yup
    .object({
      dir: yup.object({
        development: yup.string().required(),
        production: yup.string().required(),
      }),
      es6: yup.boolean(),
      typescript: yup.boolean(),
    })
    .validate(config)
}

module.exports = {
  validateConfig,
}
