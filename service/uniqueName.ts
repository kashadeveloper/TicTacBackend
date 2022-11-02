import { uniqueNamesGenerator, Config, adjectives, colors, animals } from 'unique-names-generator';

const customConfig: Config = {
  dictionaries: [adjectives, colors],
  separator: '-',
  length: 2,
};

function generator() {
    let string = uniqueNamesGenerator(customConfig);
    return string;
}

export default generator