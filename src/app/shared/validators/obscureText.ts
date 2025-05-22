export const obscureEmail = (string: string) => {
  const [name, domain] = string.split('@');
  return `${name[0]}${name[1]}${name[2]}${new Array(name.length).join(
    '*'
  )}@${domain}`;
};
