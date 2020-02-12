const program = require('commander');
const majo = require('majo');
const style = require('ansi-styles');

const unified = require('unified');
const parse = require('remark-parse');
const stringify = require('remark-stringify');

const yamlConfig = require('remark-yaml-config');
const frontmatter = require('remark-frontmatter');

const remarkWithYaml = unified()
  .use(parse)
  .use(stringify, {
    paddedTable: false,
    listItemIndent: 1,
  })
  .use(frontmatter)
  .use(yamlConfig);

const stream = majo();

function getCellValue(node) {
  return node.children[0].children[0].value;
}

const sizeBreakPoints = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];

const groups = {
  isDynamic: val => /^on[A-Z]/.test(val),
  isSize: val => sizeBreakPoints.indexOf(val) > -1,
};

function asciiSort(prev, next) {
  if (prev > next) {
    return 1;
  }

  if (prev < next) {
    return -1;
  }

  return 0;
}

function alphabetSort(nodes) {
  return nodes.sort((...comparison) =>
    asciiSort(...comparison.map(val => getCellValue(val).toLowerCase()))
  );
}

function sizeSort(nodes) {
  return nodes.sort((...comparison) =>
    asciiSort(...comparison.map(val => sizeBreakPoints.indexOf(getCellValue(val).toLowerCase())))
  );
}

function sort(ast) {
  ast.children.forEach(child => {
    const staticProps = [];
    const dynamicProps = [];
    const sizeProps = [];

    if (child.type === 'table') {
      child.children.slice(1).forEach(node => {
        const value = getCellValue(node);
        if (groups.isDynamic(value)) {
          dynamicProps.push(node);
        } else if (groups.isSize(value)) {
          sizeProps.push(node);
        } else {
          staticProps.push(node);
        }
      });

      // eslint-disable-next-line
      child.children = [
        child.children[0],
        ...alphabetSort(staticProps),
        ...sizeSort(sizeProps),
        ...alphabetSort(dynamicProps),
      ];
    }
  });

  return ast;
}

function sortAPI(md) {
  return remarkWithYaml.stringify(sort(remarkWithYaml.parse(md)));
}

function sortMiddleware(ctx) {
  Object.keys(ctx.files).forEach(filename => {
    const content = ctx.fileContents(filename);
    ctx.writeContents(filename, sortAPI(content));
  });
}

module.exports = () => {
  program
    .version('0.1.0')
    .option(
      '-f, --file [file]',
      'Specify which file to be transformed',
      'components/**/index.+(zh-CN|en-US).md'
    )
    .parse(process.argv);
  stream
    .source(program.file)
    .use(sortMiddleware)
    .dest('.')
    .then(() => {
      /* eslint-disable no-console */
      console.log(`${style.green.open}sort gui api successfully!${style.green.close}`);
      /* eslint-enable no-console */
    });
};
