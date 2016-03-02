using Microsoft.Owin;
using Owin;

[assembly: OwinStartupAttribute(typeof(SqlElasticBridge.Startup))]
namespace SqlElasticBridge
{
    public partial class Startup
    {
        public void Configuration(IAppBuilder app)
        {
            ConfigureAuth(app);
        }
    }
}
