import { Outlet } from 'react-router-dom'
import Header from '../components/Header'
import { Web3Wrapper } from 'App'

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Web3Wrapper>
      <div className="container md:max-w-md mx-auto text-black bg-gray-200 h-screen pb-[100px]">
        <Header />
        <div className="pt-[55px]">
          <Outlet />
        </div>
      </div>
    </Web3Wrapper>
  )
}

export default MainLayout
