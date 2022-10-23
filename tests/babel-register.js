/**
 * https://github.com/babel/babel/issues/8962#issuecomment-622339058
 */
require('@babel/register')({
  extensions: ['.ts', '.tsx', '.js', '.jsx'],
  sourceMaps: 'both',
  retainLines: true,
})
