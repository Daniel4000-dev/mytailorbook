const { renderToStaticMarkup } = require('react-dom/server');
const React = require('react');
const { FaWhatsapp } = require('react-icons/fa6');

console.log(renderToStaticMarkup(React.createElement(FaWhatsapp, { size: 24 })));
