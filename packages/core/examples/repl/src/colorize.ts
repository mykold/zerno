export const colors = {
  red: (str: string) => `\x1b[31m${str}\x1b[0m`,
  green: (str: string) => `\x1b[32m${str}\x1b[0m`,
  gray: (str: string) => `\x1b[90m${str}\x1b[0m`,
  yellow: (str: string) => `\x1b[33m${str}\x1b[0m`,
  cyan: (str: string) => `\x1b[36m${str}\x1b[0m`,
  magenta: (str: string) => `\x1b[35m${str}\x1b[0m`,
};

export function colorizeObject(
  obj: any,
  pallete?: {
    key?: (str: string) => string;
    string?: (str: string) => string;
    number?: (str: string) => string;
    boolean?: (str: string) => string;
    null?: (str: string) => string;
  },
): string {
  const p = {
    key: pallete?.key ?? colors.cyan,
    string: pallete?.string ?? colors.green,
    number: pallete?.number ?? colors.yellow,
    boolean: pallete?.boolean ?? colors.magenta,
    null: pallete?.null ?? colors.gray,
  };

  return JSON.stringify(obj, null, 0).replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^"])*?"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let printColor = p.number;
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          printColor = p.key;
        } else {
          printColor = p.string;
        }
      } else if (/true|false/.test(match)) {
        printColor = p.boolean;
      } else if (/null/.test(match)) {
        printColor = p.null;
      }
      return printColor(match);
    },
  );
}

export function colorize(message: any): string {
  if (typeof message !== "string") return colorizeObject(message);
  if (message.startsWith("ERROR:")) return colors.red(message);
  if (message.startsWith("INFO:")) return colors.green(message);
  if (message.startsWith("DEBUG:")) return colors.gray(message);
  return message;
}
