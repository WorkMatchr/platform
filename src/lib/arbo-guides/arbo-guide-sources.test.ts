import { describe, expect, it } from 'vitest'
import { resolvePublicSources } from '@/content/public-sources'
import { groupArboGuideSources, selectArboGuideSources, toArboGuideReportSource } from './arbo-guide-sources'

describe('Arbo-wijzer-bronselectie', () => {
  it('behoudt alle wetgeving en maximaal één richtlijn en aanvullende bron', () => {
    const sources = resolvePublicSources([
      'arbowet-current',
      'arbeidsinspectie-bhv-2025',
      'arboportaal-bhv',
      'ai-10-bhv-2001',
      'ai-10-bhv-2001',
    ]).map(toArboGuideReportSource)
    const selected = selectArboGuideSources(sources)

    expect(selected.map((source) => source.id)).toEqual([
      'arbowet-current',
      'arbeidsinspectie-bhv-2025',
      'ai-10-bhv-2001',
    ])
    expect(groupArboGuideSources(selected).map((group) => group.label)).toEqual([
      'Wetgeving', 'Richtlijn', 'Aanvullende bron',
    ])
  })
})
