import { instanceId } from '../../lib/instance-id'
import { permix } from '../../lib/permix'

export async function ConcurrentInstances() {
  return (
    <div>
      <InstanceSlot testId="instance-a" />
      <InstanceSlot testId="instance-b" />
    </div>
  )
}

async function InstanceSlot({ testId }: { testId: string }) {
  const instance = await permix.getPermix()
  return <span data-testid={testId}>{String(instanceId(instance))}</span>
}
