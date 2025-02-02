import { CHAIN_NAMESPACES, SafeEventEmitterProvider } from '@web3auth/base'
import { Web3Auth } from '@web3auth/modal'
import { OpenloginAdapter, OpenloginUserInfo } from '@web3auth/openlogin-adapter'
import { TorusWalletAdapter } from '@web3auth/torus-evm-adapter'
import { TorusWalletConnectorPlugin } from '@web3auth/torus-wallet-connector-plugin'
import { createContext, useContext, useEffect, useState } from 'react'
import RPC from 'utils/ethers'
import Web3, { Bytes, eth } from 'web3'

interface Web3AuthContextInterface {
  isInitiated: boolean
  torusAddress: string
  web3Auth: Web3Auth | null
  web3: Web3 | undefined
  userInfo: Partial<OpenloginUserInfo> | undefined
  initWeb3AuthModal: () => Promise<void>
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  isConnected: () => boolean
  signMessage: (message: string) => Promise<{ signature: string } | undefined>
  writeContract: (data: { abi: any; contractAddress: string; data: string[] }) => Promise<Bytes | null>
  getAccounts: () => Promise<any>
  getUserInfo: () => Promise<any>
}

interface Web3AuthProviderProps {
  children: React.ReactNode
}

export function useWeb3Auth() {
  const context = useContext(Web3AuthContext)

  if (!context) {
    throw new Error('useApi must be used within a Web3AuthProvider')
  }
  return context
}

export const Web3AuthContext = createContext<Web3AuthContextInterface | undefined>(undefined)

export const Web3AuthProvider = ({ children }: Web3AuthProviderProps) => {
  const [web3Auth, setWeb3Auth] = useState<Web3Auth | null>(null)
  const [provider, setProvider] = useState<SafeEventEmitterProvider | null>(null)
  const [torusPlugin, setTorusPlugin] = useState<TorusWalletConnectorPlugin>()
  const [torusAddress, setTorusAddress] = useState<string>('')
  const [web3, setWeb3] = useState<Web3>()
  const [isInitiated, setIsInitiated] = useState<boolean>(false)

  const [userInfo, setUserInfo] = useState<Partial<OpenloginUserInfo>>()

  async function initWeb3AuthModal(): Promise<void> {
    // const MUMBAI_HEXADECIMAL_CHAIN_ID = parseInt(import.meta.env.VITE_DEFAULT_CHAIN_ID).toString(16)

    const web3auth = new Web3Auth({
      clientId: import.meta.env.VITE_WEB3AUTH_CLIENT_ID,
      web3AuthNetwork: import.meta.env.VITE_WEB3AUTH_NETWORK,
      chainConfig: {
        chainNamespace: CHAIN_NAMESPACES.EIP155,
        chainId: `${import.meta.env.VITE_DEFAULT_CHAIN_ID_HEX}`,
        rpcTarget: import.meta.env.VITE_INFURA_URL,
      },
    })

    const openloginAdapter = new OpenloginAdapter({
      loginSettings: {
        mfaLevel: 'optional',
      },
      adapterSettings: {
        uxMode: 'popup',
        whiteLabel: {
          name: 'Web3Auth',
          logoLight: 'https://web3auth.io/images/w3a-L-Favicon-1.svg',
          logoDark: 'https://web3auth.io/images/w3a-D-Favicon-1.svg',
          defaultLanguage: 'en',
          dark: true, // whether to enable dark mode. defaultValue: false
        },
        network: 'testnet',
      },
    })

    web3auth.configureAdapter(openloginAdapter)

    const torusplugin = new TorusWalletConnectorPlugin({
      torusWalletOpts: { buttonSize: 50, buttonPosition: 'bottom-left', modalZIndex: 99 },
      walletInitOptions: {
        whiteLabel: {
          theme: { isDark: true, colors: { primary: '#00a8ff' } },
          logoDark: 'https://web3auth.io/images/w3a-L-Favicon-1.svg',
          logoLight: 'https://web3auth.io/images/w3a-D-Favicon-1.svg',
        },
        useWalletConnect: false,
        enableLogging: false,
      },
    })

    setTorusPlugin(torusplugin as any)
    await web3auth.addPlugin(torusplugin)

    const torusWalletAdapter = new TorusWalletAdapter({
      clientId: import.meta.env.VITE_WEB3AUTH_CLIENT_ID,
    })

    // it will add/update  the torus-evm adapter in to web3auth class
    web3auth.configureAdapter(torusWalletAdapter)
    setWeb3Auth(web3auth)

    await web3auth.initModal()

    setWeb3(new Web3(web3auth.provider as any))
    setProvider(web3auth.provider)

    if (web3auth.connected) {
      const user = await web3auth?.getUserInfo()
      if (user) setUserInfo(user)
      if (web3auth) setIsInitiated(true)
    }
  }

  async function connect() {
    if (web3Auth) {
      const provider = await web3Auth.connect()
      setProvider(provider)

      const user = await web3Auth?.getUserInfo()
      if (user) setUserInfo(user)
    }
  }

  async function disconnect() {
    if (web3Auth) await web3Auth.logout()
    setUserInfo(undefined)
  }

  async function signMessage(message: string) {
    if (!provider) {
      console.log('Provider not initialized yet')
      return
    }

    const rpc = new RPC(provider)
    const signedMessage = await rpc.signMessage(message)

    return { signature: signedMessage }
  }

  function isConnected() {
    return web3Auth?.status === 'connected'
  }

  async function writeContract({ abi, contractAddress, data }: { abi: any; contractAddress: string; data: string[] }) {
    if (!provider) {
      return
    }

    const rpc = new RPC(provider)
    return await rpc.mint(abi as string, contractAddress, data)
  }

  async function getAccounts() {
    if (!provider) {
      return
    }
    const rpc = new RPC(provider)
    const addresses = await rpc.getAccounts()
    return addresses
  }

  async function getUserInfo() {
    if (!web3Auth) return

    const user = await web3Auth.getUserInfo()
    return user
  }

  useEffect(() => {
    const web3 = new Web3(provider as any)
    setWeb3(web3)
  }, [web3Auth?.connected])

  useEffect(() => {
    async function init() {
      await initWeb3AuthModal()
    }

    init()
  }, [])

  return (
    <Web3AuthContext.Provider
      value={{
        initWeb3AuthModal,
        connect,
        disconnect,
        signMessage,
        writeContract,
        isConnected,
        web3Auth,
        torusAddress,
        web3,
        isInitiated,
        userInfo,
        getAccounts,
        getUserInfo,
      }}
    >
      {children}
    </Web3AuthContext.Provider>
  )
}
