declare global {
  interface Window {
    google?: typeof google;
  }

  namespace google {
    namespace accounts {
      namespace id {
        interface CredentialResponse {
          credential: string;
          select_by?: string;
        }

        interface IdConfiguration {
          client_id: string;
          callback: (response: CredentialResponse) => void;
          auto_select?: boolean;
        }

        interface GsiButtonConfiguration {
          type?: 'standard' | 'icon';
          text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
          locale?: string;
          width?: string | number;
          size?: 'large' | 'medium' | 'small';
        }

        function initialize(configuration: IdConfiguration): void;
        function renderButton(parent: HTMLElement, configuration: GsiButtonConfiguration): void;
        function cancel(): void;
        function disableAutoSelect(): void;
      }
    }
  }
}

export {};
