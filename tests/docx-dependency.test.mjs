import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const mammoth = require('mammoth');
// Use the parser's own declared ZIP dependency, without adding another runtime package.
const mammothRequire = createRequire(require.resolve('mammoth'));
const JSZip = mammothRequire('jszip');

test('updated DOCX parser extracts an actual synthetic in-memory document', async () => {
    const zip = new JSZip();
    zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
    zip.file('_rels/.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
    zip.file('word/document.xml', '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Synthetic Phase 0 document</w:t></w:r></w:p></w:body></w:document>');
    const buffer = await zip.generateAsync({ type: 'nodebuffer' });
    const result = await mammoth.extractRawText({ buffer });
    assert.equal(result.value.trim(), 'Synthetic Phase 0 document');
    assert.deepEqual(result.messages, []);
});

test('targeted argparse override preserves upstream Mammoth CLI compatibility', () => {
    const argparseRequire = createRequire(mammothRequire.resolve('argparse'));
    assert.equal(argparseRequire('./package.json').version, '2.0.1');
    const childEnv = { ...process.env };
    delete childEnv.NODE_TEST_CONTEXT;
    const result = spawnSync(process.execPath, [require.resolve('mammoth/bin/mammoth'), '--help'], {
        encoding: 'utf8', timeout: 5000, env: childEnv,
    });
    assert.equal(result.status, 0);
    assert.match(result.stdout, /output-format/);
});
