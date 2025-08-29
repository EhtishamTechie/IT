import api from '../api.js';

// Submit contact form
const submitContact = (contactData) => {
  return api.post('/contact/submit', contactData);
};

export const contactAPI = {
  submitContact
};
