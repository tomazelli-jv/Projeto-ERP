using ERP.Application.Abstractions;
using Microsoft.Extensions.Logging;

namespace ERP.Infrastructure.Notifications;

public sealed class NullPasswordSetupNotifier(ILogger<NullPasswordSetupNotifier> logger) : IPasswordSetupNotifier
{
    public Task DeliverAsync(PasswordSetupNotification notification, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("Password setup notification accepted for delivery to user {UserEmailDomain}",
            notification.Recipient.Split('@').LastOrDefault() ?? "unknown");
        return Task.CompletedTask;
    }
}
