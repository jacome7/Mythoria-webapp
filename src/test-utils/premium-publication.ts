import fixture from '@/lib/premium-children-book/worker-manifest.fixture.json';

const lines = fixture.pages[1].text.split('\n');
const fields = lines.slice(0, 5).map((line) => {
  const divider = line.indexOf(': ');
  return { label: line.slice(0, divider), value: line.slice(divider + 2) };
});

export const frozenPublicationDetails = {
  title: fields[0],
  details: fields.slice(1),
  copyright: lines[5],
  rights: lines[6],
  promotion: lines[7],
};
