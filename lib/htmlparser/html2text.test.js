import html2text from './html2text'

describe('html2text', () => {
  it('can parse crazy text', async () => {
    const html = `<p><a href='www.hylo.com'>Hylo</a> <strong>Some Bold Text</strong> 

<a>www.hylo.com</a> <a data-entity-type="mention" data-user-id="24658">Sam Frank</a>
</p> 
hello world <a href="#" data-entity-type="mention" data-user-id="12">Ray Marceauhh</a> I&#x27;m  #ray <br> 
<p><a data-entity-type="#mention">#dadsf</a></p>
<p></p><p>One Line</p><p>Another Line</p>`

    const text = await html2text(html)
    expect(text).to.equal(`www.hylo.com Some Bold Text \n\nwww.hylo.com [Sam Frank:24658]\n\n \nhello world [Ray Marceauhh:12] I'm  #ray \n \n#dadsf\n\n\nOne Line\nAnother Line\n`)
  })

  it('works with mentions', async () => {
    const html = '<p><a href="#" data-entity-type="mention" data-user-id="12">Ray Marceauhh</a></p>'
    const text = await html2text(html)
    expect(text).to.equal('[Ray Marceauhh:12]\n')
  })

  it('works with topics', async () => {
    const html = '<a data-entity-type="#mention">#dadsf</a>'
    const text = await html2text(html)
    expect(text).to.equal('#dadsf')
  })

  it('works with links', async () => {
    const html = `<p></p><p><a>www.hylo.com</a> <a href='www.hylo.com'>s</a></p>`
    const text = await html2text(html)
    expect(text).to.equal('\nwww.hylo.com www.hylo.com\n')
  })

  it('works on empty strings', async () => {
    const html = ' '
    const text = await html2text(html)
    expect(text).to.equal('')
  })

  it('works on malformed html', async () => {
    const html = '<p blah><< turn off me>'
    const text = await html2text(html)
    expect(text).to.equal('&#x3C;&#x3C; turn off me>\n')
  })
})
