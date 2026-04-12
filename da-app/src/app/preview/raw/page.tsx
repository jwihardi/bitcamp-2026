// preview/raw redirects to root — the full game now lives at /.
import { redirect } from 'next/navigation'

export default function Page() {
  redirect('/')
}
