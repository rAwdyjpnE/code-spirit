import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

/**
 * @returns {string}
 */
export const generateUUID = () => {
  return uuidv4();
};

/**
 * @param {string} id 
 * @returns {boolean}
 */
export const isValidUUID = (id) => {
  return uuidValidate(id);
};

/**
 * @param {string} id 
 * @returns {string}
 */
export const shortUUID = (id) => {
  if (!id) return '';
  return `${id.slice(0, 4)}...${id.slice(-4)}`;
};