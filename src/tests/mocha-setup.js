require('@babel/register');
require('@babel/polyfill');
require('jsdom-global')();

window.Date = Date;

const { configure } = require('enzyme');
const Adapter = require('enzyme-adapter-react-16');

configure({ adapter: new Adapter() });
