import { useState } from "react";
import { useNavigate } from "react-router-dom";
import microsoftLogo from "@/assets/microsoft-logo.svg";
import { MoreVertical, Plus } from "lucide-react";

interface AccountOption {
  name: string;
  email: string;
  status?: string;
}

export default function MSCopilotLoginPage() {
  const navigate = useNavigate();
  const [hoveredAccount, setHoveredAccount] = useState<string | null>(null);

  const accounts: AccountOption[] = [
    { name: "John Doe", email: "john.doe@pneqatenant.onmicrosoft.com", status: "Signed in" },
    { name: "", email: "john.doe@celonis.com" },
    { name: "", email: "john.doe@x670r.onmicrosoft.com" },
  ];

  const handleAccountSelect = (email: string) => {
    // Simulate login and redirect to Copilot Studio
    navigate("/ms-copilot-studio");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        {/* Microsoft Logo */}
        <div className="flex items-center gap-2 mb-6">
          <img src={microsoftLogo} alt="Microsoft" className="w-6 h-6" />
          <span className="text-lg font-normal text-[#5e5e5e]">Microsoft</span>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-semibold text-[#1b1b1b] mb-1">Pick an account</h1>
        <p className="text-sm text-[#5e5e5e] mb-6">to continue to Microsoft Azure</p>

        {/* Account List */}
        <div className="space-y-1">
          {accounts.map((account) => (
            <button
              key={account.email}
              onClick={() => handleAccountSelect(account.email)}
              onMouseEnter={() => setHoveredAccount(account.email)}
              onMouseLeave={() => setHoveredAccount(null)}
              className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-sm transition-colors text-left group"
            >
              {/* Avatar */}
              <div className="w-10 h-10 bg-[#e8e8e8] rounded-sm flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-[#666]">
                  <path 
                    fill="currentColor" 
                    d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                  />
                </svg>
              </div>

              {/* Account Info */}
              <div className="flex-1 min-w-0">
                {account.name && (
                  <p className="text-sm font-semibold text-[#1b1b1b] truncate">{account.name}</p>
                )}
                <p className="text-sm text-[#5e5e5e] truncate">{account.email}</p>
                {account.status && (
                  <p className="text-xs text-[#5e5e5e]">{account.status}</p>
                )}
              </div>

              {/* More Options */}
              <div className={`transition-opacity ${hoveredAccount === account.email ? 'opacity-100' : 'opacity-0'}`}>
                <MoreVertical className="w-5 h-5 text-[#666]" />
              </div>
            </button>
          ))}

          {/* Use another account */}
          <button 
            onClick={() => navigate("/ms-copilot-studio")}
            className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-sm transition-colors text-left"
          >
            <div className="w-10 h-10 bg-[#e8e8e8] rounded-sm flex items-center justify-center flex-shrink-0">
              <Plus className="w-5 h-5 text-[#666]" />
            </div>
            <span className="text-sm text-[#1b1b1b]">Use another account</span>
          </button>
        </div>
      </div>
    </div>
  );
}
