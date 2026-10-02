import { PublicContentCard } from '@/components/public/public-content-card'
import { Heading } from '@/components/ui/heading'
import { publicLearningCatalog, publicLearningCategories, publicLearningHref } from '@/content/public-learning-catalog'

export function PublicLearningCatalog() {
  return <div className="mt-8 space-y-10">
    {publicLearningCategories.map(category => <section key={category.key} aria-labelledby={`learning-${category.key}`}>
      <Heading as="h3" size="h2" id={`learning-${category.key}`}>{category.title}</Heading>
      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {publicLearningCatalog.filter(course => course.category === category.key).map(course =>
          <PublicContentCard key={course.code} headingLevel="h4" title={course.title} status={course.status} description={course.description} href={publicLearningHref(course)} linkLabel="Bekijk opleiding">
            <dl className="mt-4 space-y-2 text-sm text-text-secondary">
              <div><dt className="font-semibold">Voor wie?</dt><dd>{course.audience}</dd></div>
              <div><dt className="font-semibold">Indicatieve duur</dt><dd>{course.duration}</dd></div>
              <div><dt className="font-semibold">Individueel</dt><dd>{course.individualPrice} per deelnemer</dd></div>
              <div><dt className="font-semibold">5 deelnemers</dt><dd>{course.teamPrice}</dd></div>
            </dl>
          </PublicContentCard>,
        )}
      </div>
    </section>)}
  </div>
}
