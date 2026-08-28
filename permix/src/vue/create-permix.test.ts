import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'

import { createPermix as createCore } from '../core'
import { createPermix } from './create-permix'

describe('vue factory contexts', () => {
  it('creates bound UI without a permix prop', () => {
    const { PermixProvider, usePermix, Check } = createPermix(
      createCore<{
        post: ['read']
      }>().setup({
        post: { read: true },
      })
    )

    const HookLabel = defineComponent({
      setup() {
        const { check, isReady } = usePermix()
        return { check, isReady }
      },
      template: `<span data-testid="hook">{{ isReady }}:{{ check('post.read') }}</span>`,
    })

    const App = defineComponent({
      components: { PermixProvider, HookLabel, Check },
      template: `
        <PermixProvider>
          <HookLabel />
          <Check path="post.read"><span>allowed</span></Check>
        </PermixProvider>
      `,
    })

    const wrapper = mount(App)
    expect(wrapper.get('[data-testid="hook"]').text()).toBe('true:true')
    expect(wrapper.text()).toContain('allowed')
  })

  it('keeps nested factory contexts independent', () => {
    const postsUI = createPermix(
      createCore<{ post: ['read'] }>().setup({ post: { read: true } })
    )
    const commentsUI = createPermix(
      createCore<{ comment: ['read'] }>().setup({ comment: { read: false } })
    )

    const Nested = defineComponent({
      setup() {
        const postsState = postsUI.usePermix()
        const commentsState = commentsUI.usePermix()
        return { postsState, commentsState }
      },
      components: {
        PostCheck: postsUI.Check,
        CommentCheck: commentsUI.Check,
      },
      template: `
        <div>
          <span data-testid="post">{{ postsState.check('post.read') }}</span>
          <span data-testid="comment">{{ commentsState.check('comment.read') }}</span>
          <PostCheck path="post.read"><span data-testid="post-check">post-ok</span></PostCheck>
          <CommentCheck path="comment.read"><span data-testid="comment-check">comment-ok</span></CommentCheck>
        </div>
      `,
    })

    const App = defineComponent({
      components: {
        PostsProvider: postsUI.PermixProvider,
        CommentsProvider: commentsUI.PermixProvider,
        Nested,
      },
      template: `
        <PostsProvider>
          <CommentsProvider>
            <Nested />
          </CommentsProvider>
        </PostsProvider>
      `,
    })

    const wrapper = mount(App)
    expect(wrapper.get('[data-testid="post"]').text()).toBe('true')
    expect(wrapper.get('[data-testid="comment"]').text()).toBe('false')
    expect(wrapper.get('[data-testid="post-check"]').text()).toBe('post-ok')
    expect(wrapper.find('[data-testid="comment-check"]').exists()).toBe(false)
  })
})
