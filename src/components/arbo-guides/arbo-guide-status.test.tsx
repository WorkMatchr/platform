import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ArboGuideStatus, arboGuideStatusPresentation } from './arbo-guide-status'

describe('Arbo-wijzerstatus', () => {
  it('presenteert alle statussen met tekst en een onderscheidende semantische stijl', () => {
    expect(Object.values(arboGuideStatusPresentation).map((item) => item.label)).toEqual([
      'Op orde', 'Actie nodig', 'Controleren', 'Niet van toepassing',
    ])
    for (const status of Object.keys(arboGuideStatusPresentation) as (keyof typeof arboGuideStatusPresentation)[]) {
      const html = renderToStaticMarkup(<ArboGuideStatus status={status} />)
      expect(html).toContain(arboGuideStatusPresentation[status].label)
      expect(html).toContain(arboGuideStatusPresentation[status].className.split(' ')[0])
    }
  })
})
