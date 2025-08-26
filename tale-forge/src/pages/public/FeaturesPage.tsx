import React from 'react';

const FeaturesPage: React.FC = () => {
  const features = [
    {
      title: "AI Story Generation",
      description: "Create unique stories with our advanced AI that adapts to your child's preferences and reading level.",
      icon: "🤖"
    },
    {
      title: "Interactive Choices",
      description: "Children can make decisions that affect the story's outcome, creating an engaging experience.",
      icon: "🎮"
    },
    {
      title: "Personalization",
      description: "Customize stories with your child's name, favorite characters, and interests.",
      icon: "👤"
    },
    {
      title: "Educational Value",
      description: "Stories designed to promote learning, vocabulary development, and critical thinking.",
      icon: "📖"
    },
    {
      title: "Multi-language Support",
      description: "Create stories in multiple languages to support bilingual education.",
      icon: "🌍"
    },
    {
      title: "Parental Controls",
      description: "Manage content, reading time, and ensure age-appropriate material.",
      icon: "👨‍👩‍👧‍👦"
    }
  ];

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Refined Floating Elements - Same as HomePage */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-amber-400/20 rounded-full animate-pulse"></div>
        <div className="absolute top-3/4 right-1/3 w-1 h-1 bg-amber-500/25 rounded-full animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-3/4 w-1.5 h-1.5 bg-amber-300/15 rounded-full animate-pulse delay-2000"></div>
        <div className="absolute top-1/3 right-2/3 w-1 h-1 bg-amber-600/20 rounded-full animate-pulse delay-3000"></div>
      </div>

      {/* Hero Section */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center max-w-7xl mx-auto">
          {/* Refined Hero Container - Same as HomePage */}
          <div className="refined-card bg-slate-900/20 border border-amber-400/10 rounded-2xl p-8 md:p-12 lg:p-16">
            {/* Main Title */}
            <h1 className="fantasy-heading-cinzel text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold mb-6 sm:mb-8 text-center">
              Powerful Features for Storytelling
            </h1>

            {/* Description */}
            <p className="text-lg sm:text-xl md:text-2xl text-slate-300 max-w-4xl mx-auto leading-relaxed mb-12 sm:mb-16 text-center">
              Discover how Tale Forge transforms the way you create and share stories with children.
            </p>

            {/* Features Grid - Same structure as HomePage */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              {features.map((feature, index) => (
                <div key={index} className="glass-card backdrop-blur-md bg-white/5 border border-white/10 rounded-lg p-6">
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-white/80">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Why Choose Section - Same structure as HomePage Featured Stories */}
      <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="glass-enhanced backdrop-blur-lg bg-black/20 border border-white/20 rounded-2xl p-8 md:p-12">
            <h2 className="fantasy-heading-cinzel text-3xl md:text-4xl font-bold text-center mb-12">
              Why Choose Tale Forge?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="glass-card bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-2">
                  Safe & Educational
                </h3>
                <p className="text-white/80">
                  All content is carefully curated to ensure it's appropriate and beneficial for children.
                </p>
              </div>
              <div className="glass-card bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-2">
                  Time-Saving
                </h3>
                <p className="text-white/80">
                  Create high-quality stories in minutes, not hours.
                </p>
              </div>
              <div className="glass-card bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-2">
                  Customizable
                </h3>
                <p className="text-white/80">
                  Tailor every aspect of the story to your child's unique needs and interests.
                </p>
              </div>
              <div className="glass-card bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-2">
                  Engaging
                </h3>
                <p className="text-white/80">
                  Interactive elements keep children engaged and excited about reading.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeaturesPage;